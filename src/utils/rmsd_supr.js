// from Thomas Madej at NCBI
/* A routine to return the superposition rmsd for 'n' pairs of corresponding
 * points.  It also returns the translation vectors and rotation matrix.
 *
 * Based on the appendix in the paper:
 *
 *  A.D. McLachlan, "Gene Duplications in the Structural Evolution of
 *  Chymotrypsin", J. Mol. Biol. 128 (1979) 49-79.
 */

iCn3DUI.prototype.rmsd_supr = function(co1, co2, n) { var me = this; //"use strict";
    var TINY0 = 1.0e-10;
    var supr;
    var rot = new Array(9);

    var i, k, flag;
    //double cp[3], cq[3];
    var cp = new THREE.Vector3(), cq = new THREE.Vector3();

    var da, ra, rb, dU, d1, d2, d3, e, s, v, over_n;
    //double ap[MAX_RES][3], bp[MAX_RES][3], mat[9];
    var ap = [], bp = [];
    var mat = new Array(9);

    var u00, u01, u02, u10, u11, u12, u20, u21, u22;

    //double v1[3][3], v2[3][3];
    var v1 = new Array(3), v2 = new Array(3);
    for(i = 0; i < 3; ++i) {
        v1[i] = new THREE.Vector3();
        v2[i] = new THREE.Vector3();
    }

    //double h1[3], h2[3], h3[3], k1[3], k2[3], k3[3];
    var h1 = new Array(3), h2 = new Array(3), h3 = new Array(3), k1 = new Array(3), k2 = new Array(3), k3 = new Array(3);

    supr = 0.0;

    if (n <= 1) return {'rot': undefined, 'trans1': undefined, 'trans2': undefined, 'rmsd': 999};

    // read in and reformat the coordinates
    // calculate the centroids
    var cp = new THREE.Vector3(), cq = new THREE.Vector3();
    for (i = 0; i < n; i++) {
        ap.push(co1[i]);
        bp.push(co2[i]);

        cp.add(co1[i]);
        cq.add(co2[i]);
    }

    cp.multiplyScalar(1.0 / n);
    cq.multiplyScalar(1.0 / n);

    // save the translation vectors
    var xc1 = cp;
    var xc2 = cq;

    // translate coordinates
    for (i = 0; i < n; i++) {
        ap[i].sub(cp);
        bp[i].sub(cq);
    }

    // radii of gyration
    for (i = 0, ra = rb = 0.0; i < n; i++) {
        ra += ap[i].x*ap[i].x + ap[i].y*ap[i].y + ap[i].z*ap[i].z;
        rb += bp[i].x*bp[i].x + bp[i].y*bp[i].y + bp[i].z*bp[i].z;
    }

    ra /= n;
    rb /= n;

    // correlation matrix U
    u00 = u01 = u02 = u10 = u11 = u12 = u20 = u21 = u22 = 0.0;

    for (i = 0; i < n; i++) {
        u00 += ap[i].x*bp[i].x;
        u01 += ap[i].x*bp[i].y;
        u02 += ap[i].x*bp[i].z;
        u10 += ap[i].y*bp[i].x;
        u11 += ap[i].y*bp[i].y;
        u12 += ap[i].y*bp[i].z;
        u20 += ap[i].z*bp[i].x;
        u21 += ap[i].z*bp[i].y;
        u22 += ap[i].z*bp[i].z;
    }

    u00 /= n; u01 /= n; u02 /= n;
    u10 /= n; u11 /= n; u12 /= n;
    u20 /= n; u21 /= n; u22 /= n;

    // determinant of U
    dU = u00*(u11*u22 - u12*u21);
    dU -= u01*(u10*u22 - u12*u20);
    dU += u02*(u10*u21 - u11*u20);
    s = (dU < 0.0) ? -1.0 : 1.0;

    // compute V = UU' (it is symmetric)
    v1[0].x = u00*u00 + u01*u01 + u02*u02;
    v1[0].y = u00*u10 + u01*u11 + u02*u12;
    v1[0].z = u00*u20 + u01*u21 + u02*u22;
    v1[1].x = v1[0].y;
    v1[1].y = u10*u10 + u11*u11 + u12*u12;
    v1[1].z = u10*u20 + u11*u21 + u12*u22;
    v1[2].x = v1[0].z;
    v1[2].y = v1[1].z;
    v1[2].z = u20*u20 + u21*u21 + u22*u22;

    // also compute V = U'U, as it may be needed
    v2[0].x = u00*u00 + u10*u10 + u20*u20;
    v2[0].y = u00*u01 + u10*u11 + u20*u21;
    v2[0].z = u00*u02 + u10*u12 + u20*u22;
    v2[1].x = v2[0].y;
    v2[1].y = u01*u01 + u11*u11 + u21*u21;
    v2[1].z = u01*u02 + u11*u12 + u21*u22;
    v2[2].x = v2[0].z;
    v2[2].y = v2[1].z;
    v2[2].z = u02*u02 + u12*u12 + u22*u22;

    // compute the eigenvalues
    mat[0] = v1[0].x; mat[1] = v1[0].y; mat[2] = v1[0].z;
    mat[3] = v1[1].x; mat[4] = v1[1].y; mat[5] = v1[1].z;
    mat[6] = v1[2].x; mat[7] = v1[2].y; mat[8] = v1[2].z;

    var eigen = me.eigen_values(mat);

    d1 = eigen.d1;
    d2 = eigen.d2;
    d3 = eigen.d3;

    // now we need the eigenvectors
    flag = 1;
    mat[0] -= d1;
    mat[4] -= d1;
    mat[8] -= d1;
    var basis = me.null_basis(mat, h1, h2, h3, TINY0);
    k = basis.k;
    h1 = basis.v1;
    h2 = basis.v2;
    h3 = basis.v3;

    if (k == 1) {
        mat[0] += d1 - d2;
        mat[4] += d1 - d2;
        mat[8] += d1 - d2;
        basis = me.null_basis(mat, h2, h3, h1, TINY0);
        k = basis.k;
        h2 = basis.v1;
        h3 = basis.v2;
        h1 = basis.v3;

        if (k == 1) {
            mat[0] += d2 - d3;
            mat[4] += d2 - d3;
            mat[8] += d2 - d3;
            basis = me.null_basis(mat, h3, h1, h2, TINY0);
            k = basis.k;
            h3 = basis.v1;
            h1 = basis.v2;
            h2 = basis.v3;
        }
    }

    if (k != 1) {
        // retry the computation, but using V = U'U
        mat[0] = v2[0].x; mat[1] = v2[0].y; mat[2] = v2[0].z;
        mat[3] = v2[1].x; mat[4] = v2[1].y; mat[5] = v2[1].z;
        mat[6] = v2[2].x; mat[7] = v2[2].y; mat[8] = v2[2].z;

        // now we need the eigenvectors
        flag = 2;
        mat[0] -= d1;
        mat[4] -= d1;
        mat[8] -= d1;
        basis = me.null_basis(mat, k1, k2, k3, TINY0);
        k = basis.k;
        k1 = basis.v1;
        k2 = basis.v2;
        k3 = basis.v3;

        if (k == 1) {
            mat[0] += d1 - d2;
            mat[4] += d1 - d2;
            mat[8] += d1 - d2;
            basis = me.null_basis(mat, k2, k3, k1, TINY0);
            k = basis.k;
            k2 = basis.v1;
            k3 = basis.v2;
            k1 = basis.v3;

            if (k == 1) {
                mat[0] += d2 - d3;
                mat[4] += d2 - d3;
                mat[8] += d2 - d3;
                basis = me.null_basis(mat, k3, k1, k2, TINY0);
                k = basis.k;
                k3 = basis.v1;
                k1 = basis.v2;
                k2 = basis.v3;
            }
        }
    }

    if (k != 1) {
        supr = 100.0;
        rot[0] = 1.0; rot[1] = 0.0; rot[2] = 0.0;
        rot[3] = 0.0; rot[4] = 1.0; rot[5] = 0.0;
        rot[6] = 0.0; rot[7] = 0.0; rot[8] = 1.0;
        return {'rot': rot, 'trans1': xc1, 'trans2': xc2, 'rmsd': supr};
    }

    if (flag == 1) {
        // compute the k-vectors via the h-vectors
        k1[0] = u00*h1[0] + u10*h1[1] + u20*h1[2];
        k1[1] = u01*h1[0] + u11*h1[1] + u21*h1[2];
        k1[2] = u02*h1[0] + u12*h1[1] + u22*h1[2];
        da = Math.sqrt(d1);
        k1[0] /= da;
        k1[1] /= da;
        k1[2] /= da;
        k2[0] = u00*h2[0] + u10*h2[1] + u20*h2[2];
        k2[1] = u01*h2[0] + u11*h2[1] + u21*h2[2];
        k2[2] = u02*h2[0] + u12*h2[1] + u22*h2[2];
        da = Math.sqrt(d2);
        k2[0] /= da;
        k2[1] /= da;
        k2[2] /= da;
        k3[0] = u00*h3[0] + u10*h3[1] + u20*h3[2];
        k3[1] = u01*h3[0] + u11*h3[1] + u21*h3[2];
        k3[2] = u02*h3[0] + u12*h3[1] + u22*h3[2];
        da = Math.sqrt(d3);
        k3[0] /= da;
        k3[1] /= da;
        k3[2] /= da;
    }
    else if (flag == 2) {
        // compute the h-vectors via the k-vectors
        h1[0] = u00*k1[0] + u01*k1[1] + u02*k1[2];
        h1[1] = u10*k1[0] + u11*k1[1] + u12*k1[2];
        h1[2] = u20*k1[0] + u21*k1[1] + u22*k1[2];
        da = Math.sqrt(d1);
        h1[0] /= da;
        h1[1] /= da;
        h1[2] /= da;
        h2[0] = u00*k2[0] + u01*k2[1] + u02*k2[2];
        h2[1] = u10*k2[0] + u11*k2[1] + u12*k2[2];
        h2[2] = u20*k2[0] + u21*k2[1] + u22*k2[2];
        da = Math.sqrt(d2);
        h2[0] /= da;
        h2[1] /= da;
        h2[2] /= da;
        h3[0] = u00*k3[0] + u01*k3[1] + u02*k3[2];
        h3[1] = u10*k3[0] + u11*k3[1] + u12*k3[2];
        h3[2] = u20*k3[0] + u21*k3[1] + u22*k3[2];
        da = Math.sqrt(d3);
        h3[0] /= da;
        h3[1] /= da;
        h3[2] /= da;
    }

    if (s > 0.0) {
        rot[0] = (k1[0]*h1[0] + k2[0]*h2[0] + k3[0]*h3[0]);
        rot[1] = (k1[0]*h1[1] + k2[0]*h2[1] + k3[0]*h3[1]);
        rot[2] = (k1[0]*h1[2] + k2[0]*h2[2] + k3[0]*h3[2]);
        rot[3] = (k1[1]*h1[0] + k2[1]*h2[0] + k3[1]*h3[0]);
        rot[4] = (k1[1]*h1[1] + k2[1]*h2[1] + k3[1]*h3[1]);
        rot[5] = (k1[1]*h1[2] + k2[1]*h2[2] + k3[1]*h3[2]);
        rot[6] = (k1[2]*h1[0] + k2[2]*h2[0] + k3[2]*h3[0]);
        rot[7] = (k1[2]*h1[1] + k2[2]*h2[1] + k3[2]*h3[1]);
        rot[8] = (k1[2]*h1[2] + k2[2]*h2[2] + k3[2]*h3[2]);
    }
    else {
        rot[0] = (k1[0]*h1[0] + k2[0]*h2[0] - k3[0]*h3[0]);
        rot[1] = (k1[0]*h1[1] + k2[0]*h2[1] - k3[0]*h3[1]);
        rot[2] = (k1[0]*h1[2] + k2[0]*h2[2] - k3[0]*h3[2]);
        rot[3] = (k1[1]*h1[0] + k2[1]*h2[0] - k3[1]*h3[0]);
        rot[4] = (k1[1]*h1[1] + k2[1]*h2[1] - k3[1]*h3[1]);
        rot[5] = (k1[1]*h1[2] + k2[1]*h2[2] - k3[1]*h3[2]);
        rot[6] = (k1[2]*h1[0] + k2[2]*h2[0] - k3[2]*h3[0]);
        rot[7] = (k1[2]*h1[1] + k2[2]*h2[1] - k3[2]*h3[1]);
        rot[8] = (k1[2]*h1[2] + k2[2]*h2[2] - k3[2]*h3[2]);
    }

    // optimal rotation correction via eigenvalues
    d1 = Math.sqrt(d1);
    d2 = Math.sqrt(d2);
    d3 = Math.sqrt(d3);
    v = d1 + d2 + s*d3;
    e = ra + rb - 2.0*v;

    if (e > 0.0) {
        supr = Math.sqrt(e);
    }
    else {
        supr = undefined;
    }

    return {'rot': rot, 'trans1': xc1, 'trans2': xc2, 'rmsd': supr};

}; // end rmsd_supr

iCn3DUI.prototype.eigen_values = function(a0) { var me = this; //"use strict";
    var v00, v01, v02, v10, v11, v12, v20, v21, v22;
    var a, b, c, p, q, t, u, v, d1, d2, d3;

    // initialization
    v00 = a0[0]; v01 = a0[1]; v02 = a0[2];
    v10 = a0[3]; v11 = a0[4]; v12 = a0[5];
    v20 = a0[6]; v21 = a0[7]; v22 = a0[8];

    // coefficients of the characteristic polynomial for V
    // det(xI - V) = x^3 + a*x^2 + b*x + c
    a = -(v00 + v11 + v22);
    b = v00*v11 + (v00 + v11)*v22 - v12*v21 - v01*v10 - v02*v20;
    c = -v00*v11*v22 + v00*v12*v21 + v01*v10*v22 - v01*v12*v20 - v02*v10*v21
        + v02*v11*v20;

    // transformed polynomial: x = y - a/3, poly(y) = y^3 + p*y + q
    p = -a*a/3.0 + b;
    q = a*a*a/13.5 - a*b/3.0 + c;

    // solutions y = u + v
    t = 0.25*q*q + p*p*p/27.0;

    if (t < 0.0) {
        var r, theta;

        // things are a bit more complicated
        r = Math.sqrt(0.25*q*q - t);
        theta = Math.acos(-0.5*q/r);
        d1 = 2.0*Math.cbrt(r)*Math.cos(theta/3.0);
    }
    else {
        u = Math.cbrt(-0.5*q + Math.sqrt(t));
        v = Math.cbrt(-0.5*q - Math.sqrt(t));
        d1 = u + v;
    }

    // return to the original characteristic polynomial
    d1 -= a/3.0;
    a += d1;
    c /= -d1;

    // solve the quadratic x^2 + a*x + c = 0
    d2 = 0.5*(-a + Math.sqrt(a*a - 4.0*c));
    d3 = 0.5*(-a - Math.sqrt(a*a - 4.0*c));

    // order the eigenvalues: d1 >= d2 >= d3
    if (d2 < d3) {
        t = d3;
        d3 = d2;
        d2 = d3;
    }

    if (d1 < d2) {
        t = d2;
        d2 = d1;
        d1 = t;
    }

    if (d2 < d3) {
        t = d3;
        d3 = d2;
        d2 = d3;
    }

    return {'d1': d1, 'd2': d2, 'd3': d3};
}; // end eigen_values

// Return the basis for the null space of the input matrix.
iCn3DUI.prototype.null_basis = function(a0, v1, v2, v3, epsi) { var me = this; //"use strict";
    var k, spec;
    var a11, a12, a13, a21, a22, a23, a31, a32, a33;
    var b22, b23, b32, b33;
    var q, t, mx0;

    // initialization
    a11 = a0[0]; a12 = a0[1]; a13 = a0[2];
    a21 = a0[3]; a22 = a0[4]; a23 = a0[5];
    a31 = a0[6]; a32 = a0[7]; a33 = a0[8];

    // scale the matrix, so find the max entry
    mx0 = Math.abs(a11);
    if (Math.abs(a12) > mx0) mx0 = Math.abs(a12);
    if (Math.abs(a13) > mx0) mx0 = Math.abs(a13);
    if (Math.abs(a21) > mx0) mx0 = Math.abs(a21);
    if (Math.abs(a22) > mx0) mx0 = Math.abs(a22);
    if (Math.abs(a23) > mx0) mx0 = Math.abs(a23);
    if (Math.abs(a31) > mx0) mx0 = Math.abs(a31);
    if (Math.abs(a32) > mx0) mx0 = Math.abs(a32);
    if (Math.abs(a33) > mx0) mx0 = Math.abs(a33);

    if (mx0 < 1.0e-10) {
        // interpret this as the matrix of all 0's
        k0 = 3;
        return {'k': k0, 'v1': v1, 'v2': v2, 'v3': v3};
    }

    spec = 0;
    a11 /= mx0; a12 /= mx0; a13 /= mx0;
    a21 /= mx0; a22 /= mx0; a23 /= mx0;
    a31 /= mx0; a32 /= mx0; a33 /= mx0;

    if ((Math.abs(a11) < epsi) && (Math.abs(a21) < epsi) && (Math.abs(a31) < epsi)) {
        // var x1 is independent
        k = 1;
        v1[0] = 1.0; v1[1] = 0.0; v1[2] = 0.0;

        if ((Math.abs(a12) < epsi) && (Math.abs(a22) < epsi) && (Math.abs(a32) < epsi)) {
            // var x2 is independent
            k = 2;
            v2[0] = 0.0; v2[1] = 1.0; v2[2] = 0.0;

            if ((Math.abs(a13) < epsi) && (Math.abs(a23) < epsi) && (Math.abs(a33) < epsi)) {
                // var x3 is independent
                k = 3;
                v3[0] = 0.0; v3[1] = 0.0; v3[2] = 1.0;
            }

            // else, we must have x3 = 0.0, so we're done
        }
        else {
            // reorder so that a12 is maximized
            mx0 = Math.abs(a12);

            if (Math.abs(a22) > mx0) {
                // swap rows 1 and 2
                t = a11; a11 = a21; a21 = t;
                t = a12; a12 = a22; a22 = t;
                t = a13; a13 = a23; a23 = t;
                mx0 = Math.abs(a12);
            }

            if (Math.abs(a32) > mx0) {
                // swap rows 1 and 3
                t = a11; a11 = a31; a31 = t;
                t = a12; a12 = a32; a32 = t;
                t = a13; a13 = a33; a33 = t;
            }

            // var x2 is dependent, x2 = -a13/a12*x3
            b32 = a23 - a22*a13/a12;
            b33 = a33 - a32*a13/a12;

            if ((Math.abs(b32) < epsi) && (Math.abs(b33) < epsi)) {
                //* var x3 is independent
                k = 2;
                v2[0] = 0.0; v2[1] = -a13/a12; v2[2] = 1.0;
                spec = 1;
            }

            // else, we must have x3 = x2 = 0.0, so we're done
        }
    }
    else {
        // reorder so that a11 is maximized
        mx0 = Math.abs(a11);

        if (Math.abs(a12) > mx0) {
            // swap rows 1 and 2
            t = a11; a11 = a21; a21 = t;
            t = a12; a12 = a22; a22 = t;
            t = a13; a13 = a23; a23 = t;
            mx0 = Math.abs(a11);
        }

        if (Math.abs(a13) > mx0) {
            // swap rows 1 and 3
            t = a11; a11 = a31; a31 = t;
            t = a12; a12 = a32; a32 = t;
            t = a13; a13 = a33; a33 = t;
        }

        // var x1 is dependent, x1 = -a12/a11*x2 - a13/a11*x3
        b22 = a22 - a21*a12/a11;
        b23 = a23 - a21*a13/a11;
        b32 = a32 - a31*a12/a11;
        b33 = a33 - a31*a13/a11;

        if ((Math.abs(b22) < epsi) && (Math.abs(b32) < epsi)) {
            // var x2 is independent
            k = 1;
            v1[0] = -a12/a11; v1[1] = 1.0; v1[2] = 0.0;

            if ((Math.abs(b23) < epsi) && (Math.abs(b33) < epsi)) {
                // var x3 is independent
                k = 2;
                v2[0] = -a13/a11; v2[1] = 0.0; v2[2] = 1.0;
                spec = 2;
            }

            // else, we must have x3 = 0.0, so we're done
        }
        else {
            // reorder so that b22 is maximized
            if (Math.abs(b22) < Math.abs(b32)) {
                t = b22; b22 = b32; b32 = t;
                t = b23; b23 = b33; b33 = t;
            }

            // var x2 is dependent, x2 = -b23/b22*x3
            if (Math.abs(b33 - b23*b32/b22) < epsi) {
                // var x3 is independent
                k = 1;
                v1[0] = (a12/a11)*(b23/b22) - a13/a11;
                v1[1] = -b23/b22; v1[2] = 1.0;
                spec = 3;
            }
            else {
                // the null space contains only the zero vector
                k0 = 0;
                v1[0] = 0.0; v1[1] = 0.0; v1[2] = 0.0;
                //return;
                return {'k': k0, 'v1': v1, 'v2': v2, 'v3': v3};
            }
        }
    }

    k0 = k;

    if (spec > 0) {
        // special cases, basis should be orthogonalized
        if (spec == 1) {
            // 2nd vector must be normalized
            a11 = v2[0]; a12 = v2[1]; a13 = v2[2];
            t = Math.sqrt(a11*a11 + a12*a12 + a13*a13);
            v2[0] = a11/t; v2[1] = a12/t; v2[2] = a13/t;
        }
        else if (spec == 2) {
            // 1st, 2nd vectors must be orthogonalized
            a11 = v1[0]; a12 = v1[1]; a13 = v1[2];
            a21 = v2[0]; a22 = v2[1]; a23 = v2[2];
            t = a11*a21 + a12*a22 + a13*a23;

            if (Math.abs(t) >= epsi) {
                q = -(a11*a11 + a12*a12 + a13*a13)/t;
                v2[0] = a11 + t*a21;
                v2[1] = a12 + t*a22;
                v2[2] = a13 + t*a23;
                a21 = v2[0]; a22 = v2[1]; a23 = v2[2];
            }

            // normalize the vectors
            t = Math.sqrt(a11*a11 + a12*a12 + a13*a13);
            v1[0] = a11/t; v1[1] = a12/t; v1[2] = a13/t;
            t = Math.sqrt(a21*a21 + a22*a22 + a23*a23);
            v2[0] = a21/t; v2[1] = a22/t; v2[2] = a23/t;
        }
        else {
            // 1st vector must be normalized
            a11 = v1[0]; a12 = v1[1]; a13 = v1[2];
            t = Math.sqrt(a11*a11 + a12*a12 + a13*a13);
            v1[0] = a11/t; v1[1] = a12/t; v1[2] = a13/t;
        }
    }

    return {'k': k0, 'v1': v1, 'v2': v2, 'v3': v3};
}; // end null_basis
